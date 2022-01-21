package panda.reppy.util;

import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.Activity;
import net.dv8tion.jda.api.requests.GatewayIntent;
import net.dv8tion.jda.api.utils.ChunkingFilter;
import net.dv8tion.jda.api.utils.MemberCachePolicy;
import net.dv8tion.jda.api.utils.cache.CacheFlag;
import panda.reppy.commands.BaseCommand;
import panda.reppy.commands.slashcommands.Ping;
import panda.reppy.commands.slashcommands.PostQuestion;
import panda.reppy.commands.slashcommands.Stop;
import panda.reppy.entities.MessageWaiter;
import panda.reppy.listeners.MessageListener;
import panda.reppy.listeners.SlashCommandListener;
import panda.reppy.util.constants.SnowflakeConstants;

import javax.security.auth.login.LoginException;
import java.util.Arrays;
import java.util.Map;

import static panda.reppy.listeners.SlashCommandListener.getCommandMap;

public class Bot {

    public Bot(final String token) throws LoginException, InterruptedException {
        JDABuilder builder = JDABuilder.createDefault(token);

        addListeners(builder);
        configureMemoryUsage(builder);

        JDA jda = builder.build();
        jda.awaitReady();

        Map<String, BaseCommand> loadedCommands = getCommandMap();

        jda.getGuildById(SnowflakeConstants.HOME_GUILD_ID)
                .updateCommands().addCommands(loadedCommands.values()).queue();
    }

    private static void addListeners(JDABuilder builder) {
        SlashCommandListener slashCommandListener = new SlashCommandListener();
        initSlashCommands(slashCommandListener);

        builder.addEventListeners(new MessageListener(), slashCommandListener, new MessageWaiter());
    }

    private static void configureMemoryUsage(JDABuilder builder) {
        builder
            // Enable the bulk delete event.
            .setBulkDeleteSplittingEnabled(false)
            // Disable All CacheFlags.
            .disableCache(Arrays.asList(CacheFlag.values()))
            // Only cache members who are online or owner of the guild.
            .setMemberCachePolicy(MemberCachePolicy.ONLINE.or(MemberCachePolicy.OWNER))
            // Disable member chunking on startup.
            .setChunkingFilter(ChunkingFilter.NONE)
            // Disable All intents
            .disableIntents(Arrays.asList(GatewayIntent.values()))
            // Enable specific intents.
            .enableIntents(GatewayIntent.DIRECT_MESSAGES, GatewayIntent.GUILD_MESSAGES)
            // Consider guilds with more than 50 members as "large".
            // Large guilds will only provide online members in the setup and thus reduce
            // bandwidth if chunking is disabled.
            .setLargeThreshold(50)
            // Set Activity to display the version.
            .setActivity(Activity.playing("v0.1.0_alpha"));
    }

    private static void initSlashCommands(SlashCommandListener listener) {
        // Member Specific Commands
        listener.initCommands(new Ping(), new PostQuestion());

        // Admin Specific Commands

        // Owner Specific Commands
        listener.initCommands(new Stop());
    }
}
